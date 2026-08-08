"use client";

export type Booking = {
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

type BookingCardProps = {
  booking: Booking;
  showDate?: boolean;
  onEdit?: (booking: Booking) => void;
  onConfirm?: (booking: Booking) => void;
  onCancel?: (booking: Booking) => void;
  isUpdating?: boolean;
};

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
  const [hoursText, minutesText = "00"] = timeString.split(":");
  const hours = Number(hoursText);
  const minutes = minutesText.slice(0, 2).padStart(2, "0");

  const suffix = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes} ${suffix}`;
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

function getStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "Confirmed";

    case "pending":
      return "Pending";

    case "cancelled":
      return "Cancelled";

    case "completed":
      return "Completed";

    default:
      return status;
  }
}

export default function BookingCard({
  booking,
  showDate = false,
  onEdit,
  onConfirm,
  onCancel,
  isUpdating = false,
}: BookingCardProps) {
  const bookingStatus = booking.status.toLowerCase();
  const isLargeBooking = booking.guests >= 10;

  const canConfirm = bookingStatus === "pending" && Boolean(onConfirm);

  const canCancel =
    bookingStatus !== "cancelled" &&
    bookingStatus !== "completed" &&
    Boolean(onCancel);

  const showActions = Boolean(onEdit) || canConfirm || canCancel;

  return (
    <article
      className={`rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6 ${
        isLargeBooking
          ? "border-l-4 border-amber-500"
          : "border-l-4 border-transparent"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div
            className={`min-w-24 rounded-xl px-4 py-3 text-center text-white ${
              isLargeBooking ? "bg-amber-600" : "bg-gray-900"
            }`}
          >
            <p className="text-lg font-bold">
              {formatBookingTime(booking.booking_time)}
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-gray-900">
                {booking.name}
              </h3>

              {isLargeBooking && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
                  Large booking
                </span>
              )}
            </div>

            <p
              className={`mt-1 font-semibold ${
                isLargeBooking ? "text-amber-700" : "text-gray-700"
              }`}
            >
              {booking.guests}{" "}
              {booking.guests === 1 ? "guest" : "guests"}
            </p>

            {showDate && (
              <p className="mt-1 text-sm text-gray-500">
                {formatBookingDate(booking.booking_date)}
              </p>
            )}
          </div>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1 text-sm font-semibold capitalize ${getStatusClasses(
            booking.status,
          )}`}
        >
          {getStatusLabel(booking.status)}
        </span>
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-600">
        <div className="grid gap-2 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-gray-800">Phone:</span>{" "}
            {booking.phone ? (
              <a
                href={`tel:${booking.phone}`}
                className="font-semibold text-blue-600 hover:underline"
              >
                {booking.phone}
              </a>
            ) : (
              <span className="text-gray-400">Not provided</span>
            )}
          </p>

          <p>
            <span className="font-semibold text-gray-800">Email:</span>{" "}
            {booking.email ? (
              <a
                href={`mailto:${booking.email}`}
                className="break-all font-semibold text-blue-600 hover:underline"
              >
                {booking.email}
              </a>
            ) : (
              <span className="text-gray-400">Not provided</span>
            )}
          </p>
        </div>

        {booking.special_requests && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Special request</p>

            <p className="mt-1 whitespace-pre-wrap">
              {booking.special_requests}
            </p>
          </div>
        )}

        {showActions && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(booking)}
                disabled={isUpdating}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Edit
              </button>
            )}

            {canConfirm && onConfirm && (
              <button
                type="button"
                onClick={() => onConfirm(booking)}
                disabled={isUpdating}
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdating ? "Updating…" : "Confirm"}
              </button>
            )}

            {canCancel && onCancel && (
              <button
                type="button"
                onClick={() => onCancel(booking)}
                disabled={isUpdating}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdating ? "Updating…" : "Cancel"}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}