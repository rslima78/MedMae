import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper for local device ID (Anonymous Identity)
export const getLocalDeviceId = (): string => {
  let deviceId = localStorage.getItem('medmae_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('medmae_device_id', deviceId);
  }
  return deviceId;
};
