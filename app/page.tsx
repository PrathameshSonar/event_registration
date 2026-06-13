// app/page.js
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';

// Forces Next.js to fetch fresh data every 60 seconds
export const revalidate = 60;

export default async function Home() {
  // 1. Fetch Event Details
  const { data: pageData } = await supabase
    .from('page_content')
    .select('*')
    .eq('page_identifier', 'event_details')
    .single();

  // 2. Fetch Registration Categories
  // 2. Fetch Registration Categories (Modified to show errors)
  const { data: categories, error: categoryError } = await supabase
    .from('categories')
    .select('*')
    .order('price', { ascending: true });

  // Add this line temporarily to debug!
  console.log("SUPABASE ERROR:", categoryError);
  console.log("SUPABASE DATA:", categories);

  
  // Fallback data just in case the database is empty
  const eventTitle = pageData?.title || "Upcoming Mahotsav";
  const eventDesc = pageData?.description_text || "Event details will be announced shortly.";

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">

      {/* HEADER SECTION */}
      <header className="bg-white border-b border-neutral-200 py-6 px-4 md:px-8">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight">Shankhnad Mahotsav</h1>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-neutral-600">
            <Link href="/" className="hover:text-orange-600 transition">Event Details</Link>
            <Link href="#categories" className="hover:text-orange-600 transition">Register</Link>
          </nav>
        </div>
      </header>

      {/* HERO & EVENT DETAILS SECTION */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
        <span className="text-orange-600 font-bold tracking-widest uppercase text-sm mb-4 block">
          Connect & Contribute
        </span>
        <h2 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
          {eventTitle}
        </h2>
        <p className="text-lg text-neutral-600 md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          {eventDesc}
        </p>

        {/* Quick Info Bar */}
        <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-12 text-neutral-600 mb-16">
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
            <h3 className="text-3xl font-bold mb-4">Choose Your Contribution</h3>
            <p className="text-neutral-500">Select a category to register and support the cause.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories?.map((category) => (
              <div
                key={category.id}
                className="border border-neutral-200 rounded-xl p-8 hover:shadow-lg transition flex flex-col"
              >
                <h4 className="text-xl font-bold mb-2">{category.title}</h4>
                <div className="text-3xl font-extrabold mb-4 text-orange-600">
                  ₹{category.price}
                </div>
                <p className="text-neutral-600 mb-8 flex-grow text-sm">
                  {category.description}
                </p>

                {/* This button will route to our dynamic registration form
                  E.g., /register/vip-pass-id
                */}
                <Link
                  href={`/register/${category.id}`}
                  className="w-full block text-center bg-neutral-900 text-white font-medium py-3 rounded-lg hover:bg-orange-600 transition"
                >
                  Register Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}