// lib/lucideIcons.js
// Maps a stored icon NAME (e.g. "Flame") to a lucide-react component, so admin
// highlight/benefit cards can use a named Lucide icon. If the stored value isn't
// a known name (e.g. it's an emoji "🪔"), getLucideIcon returns null and the
// caller renders it as text.
import {
  Flame, Sun, Shield, Sparkles, Bell, Flower2, ShieldCheck, HeartHandshake,
  TrendingUp, BrainCircuit, Sparkle, Star, Gift, Heart, Users, Award, Crown,
  Landmark, Moon, Sunrise, Music, BookOpen, HandHeart, Feather,
} from "lucide-react";

export const LUCIDE_ICONS = {
  Flame, Sun, Shield, Sparkles, Bell, Flower2, ShieldCheck, HeartHandshake,
  TrendingUp, BrainCircuit, Sparkle, Star, Gift, Heart, Users, Award, Crown,
  Landmark, Moon, Sunrise, Music, BookOpen, HandHeart, Feather,
};

export function getLucideIcon(name) {
  return (name && LUCIDE_ICONS[name]) || null;
}
