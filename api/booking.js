const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { nama, wa, tanggal, jam } = req.body;

    // 1. Simpan ke Database
    await supabase.from('bookings').insert([{ client_name: nama, client_wa: wa, booking_date: tanggal, booking_time: jam }]);

    // 2. Logika WhatsApp
    if (process.env.WA_TOKEN) {
     // A. Pesan Konfirmasi (Langsung)
await sendWhatsApp(wa, `🌸 *KONFIRMASI RESERVASI SPA THE OASIS* 🌸\n\nHalo ${nama} 😊\nReservasi perawatan Spa Anda pada tanggal ${tanggal} pukul ${jam} telah berhasil dikonfirmasi ✅\n\nKami siap menyambut Anda untuk pengalaman relaksasi terbaik. Sampai jumpa dan nikmati momen istimewa Anda ✨`);

      // B. Buat objek waktu Booking (WIB)
      // Kita paksa format ISO agar terbaca tepat di Asia/Jakarta
      const bookingDate = new Date(`${tanggal}T${jam}:00+07:00`);
      const bookingUnix = Math.floor(bookingDate.getTime() / 1000);

      // C. Reminder 1 Jam Sebelum (Booking - 3600 detik)
      const reminderUnix = bookingUnix - 3600;
      await sendWhatsApp(wa, `*REMINDER THE OASIS*\nHalo ${nama}, 1 jam lagi jadwal treatment Anda dimulai. Kami tunggu kedatangannya! ✨`, reminderUnix);

      // D. Follow Up 7 Hari Setelah (Booking + 604800 detik)
      const followUpUnix = bookingUnix + 604800;
      await sendWhatsApp(wa, `*GREETINGS THE OASIS*\nHalo ${nama}, sudah 1 minggu sejak kunjungan Anda. Semoga pelayanan kami memuaskan. Sampai jumpa kembali! 🌸`, followUpUnix);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

async function sendWhatsApp(target, message, unixSchedule = null) {
  const formData = new URLSearchParams();
  formData.append('target', target);
  formData.append('message', message);

  if (unixSchedule) {
    // Mengirim angka detik mentah (Unix Timestamp)
    formData.append('schedule', unixSchedule.toString());
  }

  await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { 'Authorization': process.env.WA_TOKEN },
    body: formData
  });
}
