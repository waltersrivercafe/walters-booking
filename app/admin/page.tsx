import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BookingCard from "../components/BookingCard";

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

type ViewType = "today" | "tomorrow" | "upcoming";

type AdminPageProps = {
  searchParams: Promise<{
    view?: string;
  }>;
};

export const dynamic = "force-dynamic";

function getPerthDate(offsetDays = 0) {
  const perthDateString = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [year, month, day] = perthDateString.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);

  return date.toISOString().split("T")[0];
}

function formatBookingDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Perth",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatBookingTime(timeString: string) {
  const [hours, minutes] = timeString.split(":").map(Number);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getStatusClasses(status: string) {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "bg-green-100 text-green-700";

    case "pending":
      return "bg-amber-100 text-amber-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    case "completed":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default async function AdminPage({
  searchParams,
}: AdminPageProps) {
  const params = await searchParams;

  const requestedView = params.view;

  const currentView: ViewType =
    requestedView === "tomorrow" || requestedView === "upcoming"
      ? requestedView
      : "today";

  const today = getPerthDate(0);
  const tomorrow = getPerthDate(1);
  const dayAfterTomorrow = getPerthDate(2);

  let query = supabase
    .from("bookings")
    .select("*")
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });

  if (currentView === "today") {
    query = query.eq("booking_date", today);
  }

  if (currentView === "tomorrow") {
    query = query.eq("booking_date", tomorrow);
  }

  if (currentView === "upcoming") {
    query = query.gte("booking_date", dayAfterTomorrow);
  }

  const { data: bookings, error } = await query;

  const typedBookings = (bookings ?? []) as Booking[];

  const totalGuests = typedBookings.reduce(
    (total, booking) => total + booking.guests,
    0
  );
  const largestTable =
  typedBookings.length > 0
    ? Math.max(...typedBookings.map((b) => b.guests))
    : 0;

  const nextArrival =
  typedBookings.length > 0
    ? formatBookingTime(typedBookings[0].booking_time)
    : "-";
  const pageTitle =
    currentView === "today"
      ? "Today"
      : currentView === "tomorrow"
        ? "Tomorrow"
        : "Upcoming Bookings";

  const pageDescription =
    currentView === "today"
      ? formatBookingDate(today)
      : currentView === "tomorrow"
        ? formatBookingDate(tomorrow)
        : "Bookings from the day after tomorrow onwards";

  const emptyMessage =
    currentView === "today"
      ? "No bookings for today."
      : currentView === "tomorrow"
        ? "No bookings for tomorrow."
        : "No upcoming bookings.";

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
            Walter&apos;s River Cafe
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Booking Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            View and manage restaurant bookings.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <Link
              href="/admin?view=today"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                currentView === "today"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Today
            </Link>

            <Link
              href="/admin?view=tomorrow"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                currentView === "tomorrow"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tomorrow
            </Link>

            <Link
              href="/admin?view=upcoming"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                currentView === "upcoming"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Upcoming
            </Link>
          </div>
        </div>

        <section className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {pageTitle}
              </h2>

              <p className="mt-1 text-gray-600">
                {pageDescription}
              </p>
            </div>

<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">  <div className="rounded-xl bg-white px-5 py-3 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
      Bookings
    </p>

    <p className="mt-1 text-2xl font-bold text-gray-900">
      {typedBookings.length}
    </p>
  </div>

  <div className="rounded-xl bg-white px-5 py-3 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
      Guests
    </p>

    <p className="mt-1 text-2xl font-bold text-gray-900">
      {totalGuests}
    </p>
  </div>

  <div className="rounded-xl bg-white px-5 py-3 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
      Largest Table
    </p>

    <p className="mt-1 text-2xl font-bold text-gray-900">
      {largestTable}
    </p>
  </div>

  <div className="rounded-xl bg-white px-5 py-3 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
      Next Arrival
    </p>

    <p className="mt-1 text-2xl font-bold text-gray-900">
      {nextArrival}
    </p>
  </div>
</div>

</div>

          {error && (
            <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
              Could not load bookings: {error.message}
            </div>
          )}

          <div className="mt-6 space-y-4">
            {typedBookings.map((booking) => (
              <article
                key={booking.id}
                className="rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="min-w-24 rounded-xl bg-gray-900 px-4 py-3 text-center text-white">
                      <p className="text-lg font-bold">
                        {formatBookingTime(booking.booking_time)}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {booking.name}
                      </h3>

                      <p className="mt-1 font-medium text-gray-700">
                        {booking.guests}{" "}
                        {booking.guests === 1 ? "guest" : "guests"}
                      </p>

                      {currentView === "upcoming" && (
                        <p className="mt-1 text-sm text-gray-500">
                          {formatBookingDate(booking.booking_date)}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-sm font-semibold capitalize ${getStatusClasses(
                      booking.status
                    )}`}
                  >
{booking.status === "confirmed" && "🟢 Confirmed"}

{booking.status === "pending" && "🟡 Pending"}

{booking.status === "cancelled" && "🔴 Cancelled"}

{booking.status === "completed" && "🔵 Completed"}
                  </span>
                </div>

                <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-600">
                  <div className="grid gap-2 sm:grid-cols-2">
<p>
  <span className="font-semibold text-gray-800">
    Phone:
  </span>{" "}

  <a
    href={`tel:${booking.phone}`}
    className="font-semibold text-blue-600 hover:underline"
  >
    {booking.phone}
  </a>
</p>

<p>
  <span className="font-semibold text-gray-800">
    Email:
  </span>{" "}

  <a
    href={`mailto:${booking.email}`}
    className="font-semibold text-blue-600 hover:underline"
  >
    {booking.email}
  </a>
</p>                  
</div>

                  {booking.special_requests && (
                    <div className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900">
                      <p className="font-semibold">Special request</p>

                      <p className="mt-1">
                        {booking.special_requests}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))}

            {!error && typedBookings.length === 0 && (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-lg font-semibold text-gray-800">
                  {emptyMessage}
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  New bookings will appear here automatically.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}