// app/page.js
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, Image as ImageIcon, Video, AlertCircle } from 'lucide-react';
import Link from 'next/link';

// Forces Next.js to fetch fresh data every 60 seconds
export const revalidate = 60;

export default async function Home() {
  // 1. Fetch Event Text Details
  const { data: pageData } = await supabase
    .from('page_content')
    .select('*')
    .eq('page_identifier', 'event_details')
    .single();

  // 2. Fetch Registration Tiers
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('price', { ascending: true });

  // 3. Fetch Uploaded Media Assets
  const { data: mediaItems } = await supabase
    .from('event_media')
    .select('*')
    .order('created_at', { ascending: false });

  // 4. NEW: Fetch Completed Registrations to calculate physical seats taken
  const { data: regs } = await supabase
    .from('registrations')
    .select('category_id, attendees_count')
    .in('payment_status', ['completed', 'contacted', 'enquired']); // Count paid & active enquiries

  // Calculate actual seats taken per category
  const seatsTaken: Record<string, number> = {};
  regs?.forEach(reg => {
    seatsTaken[reg.category_id] = (seatsTaken[reg.category_id] || 0) + (reg.attendees_count || 1);
  });

  const eventTitle = pageData?.title || "Upcoming Mahotsav";
  const eventDesc = pageData?.description_text || "Event details will be announced shortly.";

  const galleryImages = mediaItems?.filter(item => item.media_type === 'image') || [];
  const youtubeVideos = mediaItems?.filter(item => item.media_type === 'youtube') || [];

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-orange-100">

      {/* HEADER SECTION */}
      <header className="bg-white border-b border-neutral-200 py-6 px-4 md:px-8 sticky top-0 z-50 backdrop-blur-md bg-white/90">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">BaglaBhairav</h1>
          <nav className="flex gap-6 text-sm font-medium text-neutral-600">
            <Link href="/" className="text-orange-600 transition font-semibold">Event Details</Link>
            <Link href="/pitham" className="hover:text-orange-600 transition">Pitham</Link>
            <Link href="/previous-events" className="hover:text-orange-600 transition">Past Events</Link>
            <Link href="#categories" className="hover:text-orange-600 transition">Register</Link>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
        <span className="text-orange-600 font-bold tracking-widest uppercase text-xs mb-4 block">
          Connect & Contribute
        </span>
        <h2 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight text-neutral-950">
          {eventTitle}
        </h2>
        <p className="text-base text-neutral-600 md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          {eventDesc}
        </p>
        <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-12 text-neutral-600 mb-16 font-medium text-sm">
          <div className="flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            <span>Dates to be announced</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <MapPin className="w-5 h-5 text-orange-600" />
            <span>Venue to be announced</span>
          </div>
        </div>
      </section>

      {/* REGISTRATION CATEGORIES SECTION */}
      <section id="categories" className="bg-white py-16 md:py-24 border-t border-neutral-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-3 tracking-tight">Choose Your Contribution</h3>
            <p className="text-neutral-500 text-sm">Select a registration package to reserve your pass and support the cause.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories?.map((category) => {

              // DYNAMIC CAPACITY CALCULATION
              const taken = seatsTaken[category.id] || 0;
              const max = category.max_capacity || 0;
              const isCapacityEnforced = max > 0;
              const remaining = Math.max(0, max - taken);

              // It is full if admin manually checked "is_full", OR if the dynamic limit is reached.
              const isEffectivelyFull = category.is_full || (isCapacityEnforced && remaining === 0);

              return (
                <div key={category.id} className="border border-neutral-200 rounded-2xl p-8 hover:shadow-lg hover:border-neutral-300 transition flex flex-col justify-between bg-white relative overflow-hidden">

                  {/* Availability Badge */}
                  {isCapacityEnforced && category.show_availability && !isEffectivelyFull && (
                    <div className="absolute top-0 right-0 bg-orange-100 text-orange-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl border-b border-l border-orange-200 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Only {remaining} seats left
                    </div>
                  )}

                  <div>
                    <h4 className="text-xl font-bold mb-2 text-neutral-900 mt-2">{category.title}</h4>
                    <div className="text-3xl font-black mb-4 text-orange-600">
                      {category.is_enquiry_only ? "Enquire now" : `₹${category.price.toLocaleString('en-IN')}`}
                    </div>
                    <p className="text-neutral-600 mb-8 text-sm leading-relaxed whitespace-pre-wrap">
                      {category.description}
                    </p>
                  </div>

                  {/* ACTION BUTTON */}
                  {isEffectivelyFull ? (
                    <div className="w-full text-center bg-neutral-100 text-neutral-400 font-semibold py-3 rounded-xl border border-neutral-200 cursor-not-allowed text-sm">
                      Registrations Full
                    </div>
                  ) : (
                    <Link href={`/register/${category.id}`} className="w-full text-center bg-neutral-900 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 transition text-sm block">
                      {category.is_enquiry_only ? "Enquire Now" : "Register Now"}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* DYNAMIC MEDIA PLATFORM DISPLAY SHOWCASE */}
      {mediaItems && mediaItems.length > 0 && (
        <section className="bg-neutral-100 py-16 md:py-24 border-t border-neutral-200">
          <div className="max-w-5xl mx-auto px-4">

            {youtubeVideos.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
                  <Video className="w-5 h-5 text-orange-600" />
                  <h3 className="text-2xl font-bold tracking-tight">Video Broadcasts</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {youtubeVideos.map((video) => (
                    <div key={video.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                      <div className="aspect-video w-full">
                        <iframe src={video.url} title={video.caption || "YouTube Video"} className="w-full h-full" frameBorder="0" allowFullScreen />
                      </div>
                      {video.caption && <div className="p-4 bg-white border-t"><p className="text-sm font-semibold text-neutral-800">{video.caption}</p></div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {galleryImages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
                  <ImageIcon className="w-5 h-5 text-orange-600" />
                  <h3 className="text-2xl font-bold tracking-tight">Event Gallery</h3>
                </div>
                <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
                  {galleryImages.map((image) => (
                    <div key={image.id} className="break-inside-avoid bg-white border rounded-xl overflow-hidden shadow-sm group hover:border-neutral-400 transition">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.caption || "Gallery"} className="w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      {image.caption && <div className="p-3 bg-white border-t text-xs font-medium text-neutral-600">{image.caption}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>
      )}
    </main>
  );
}