import { supabase } from "@/lib/supabase";

type Booking = {
  id: number;
  booking_date: string;
  booking_time: string;
  guests: number;
  name: string;
  phone: string;
  email: string;
  special_requests: string | null;
  status: string;
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold">Walter&apos;s Booking Dashboard</h1>

        <p className="mt-2 text-gray-600">
          Upcoming bookings
        </p>

        {error && (
          <div className="mt-8 rounded-lg bg-red-50 p-4 text-red-700">
            Could not load bookings: {error.message}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {bookings?.map((booking: Booking) => (
            <div
              key={booking.id}
              className="rounded-xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold">
                    {booking.booking_time} — {booking.name}
                  </p>

                  <p className="mt-1 text-gray-600">
                    {booking.booking_date} · {booking.guests} guests
                  </p>
                </div>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                  {booking.status}
                </span>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>{booking.phone}</p>
                <p>{booking.email}</p>

                {booking.special_requests && (
                  <p className="mt-2">
                    Special request: {booking.special_requests}
                  </p>
                )}
              </div>
            </div>
          ))}

          {!error && bookings?.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-gray-600">
              No bookings yet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}