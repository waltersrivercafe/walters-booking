"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BookingCard, { type Booking } from "./BookingCard";

type BookingListProps = {
  bookings: Booking[];
  showDate?: boolean;
  emptyMessage: string;
};

type BookingForm = {
  name: string;
  phone: string;
  email: string;
  guests: string;
  booking_date: string;
  booking_time: string;
  special_requests: string;
  status: string;
};

type TimeOption = {
  value: string;
  label: string;
};

type StatusUpdateResponse = {
  success?: boolean;
  status?: string;
  emailSent?: boolean;
  warning?: string;
  message?: string;
  error?: string;
};

type SaveBookingResponse = {
  success?: boolean;
  booking?: Booking;
  error?: string;
  details?: string;
};

function getPerthDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatTimeLabel(time: string) {
  const [hoursText, minutesText = "00"] = time.split(":");
  const hours = Number(hoursText);
  const minutes = minutesText.slice(0, 2).padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes} ${suffix}`;
}

function formatDateLabel(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Perth",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function createTimeRange(start: string, end: string): TimeOption[] {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);

  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  const options: TimeOption[] = [];

  for (let minutes = startTotal; minutes <= endTotal; minutes += 15) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    const value = `${String(hours).padStart(2, "0")}:${String(mins).padStart(
      2,
      "0",
    )}`;

    options.push({
      value,
      label: formatTimeLabel(value),
    });
  }

  return options;
}

function isWeekend(dateString: string) {
  if (!dateString) {
    return false;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return dayOfWeek === 0 || dayOfWeek === 6;
}

function getBookingTimes(dateString: string) {
  const weekend = isWeekend(dateString);

  return {
    breakfast: weekend
      ? createTimeRange("08:00", "11:00")
      : createTimeRange("08:30", "11:00"),

    lunch: weekend
      ? createTimeRange("11:30", "15:00")
      : createTimeRange("11:30", "14:30"),
  };
}

function getValidTimeValues(dateString: string) {
  const times = getBookingTimes(dateString);

  return [...times.breakfast, ...times.lunch].map((option) => option.value);
}

function createEmptyForm(): BookingForm {
  return {
    name: "",
    phone: "",
    email: "",
    guests: "2",
    booking_date: getPerthDate(),
    booking_time: "12:00",
    special_requests: "",
    status: "confirmed",
  };
}

function createEditForm(booking: Booking): BookingForm {
  return {
    name: booking.name,
    phone: booking.phone ?? "",
    email: booking.email ?? "",
    guests: String(booking.guests),
    booking_date: booking.booking_date,
    booking_time: booking.booking_time.slice(0, 5),
    special_requests: booking.special_requests ?? "",
    status: booking.status,
  };
}

export default function BookingList({
  bookings,
  showDate = false,
  emptyMessage,
}: BookingListProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState<BookingForm>(createEmptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState<number | null>(
    null,
  );
  const [formError, setFormError] = useState("");

  const availableTimes = useMemo(
    () => getBookingTimes(form.booking_date),
    [form.booking_date],
  );

  const filteredBookings = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) {
      return bookings;
    }

    return bookings.filter((booking) => {
      const searchableText = [
        booking.name,
        booking.phone,
        booking.email,
        booking.status,
        booking.special_requests ?? "",
        booking.booking_date,
        booking.booking_time,
        String(booking.guests),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchText);
    });
  }, [bookings, search]);

  function openNewBooking() {
    setEditingBooking(null);
    setForm(createEmptyForm());
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditBooking(booking: Booking) {
    setEditingBooking(booking);
    setForm(createEditForm(booking));
    setFormError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingBooking(null);
    setFormError("");
  }

  function updateForm(field: keyof BookingForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateBookingDate(newDate: string) {
    setForm((current) => {
      const validTimes = getValidTimeValues(newDate);
      const currentTimeIsValid = validTimes.includes(current.booking_time);

      return {
        ...current,
        booking_date: newDate,
        booking_time: currentTimeIsValid ? current.booking_time : "",
      };
    });
  }

  async function saveBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const guestCount = Number(form.guests);
    const validTimes = getValidTimeValues(form.booking_date);

    if (!form.name.trim()) {
      setFormError("Please enter the customer name.");
      return;
    }

    if (!form.phone.trim()) {
      setFormError("Please enter a phone number.");
      return;
    }

    if (!Number.isInteger(guestCount) || guestCount < 1) {
      setFormError("Guests must be at least 1.");
      return;
    }

    if (!form.booking_date) {
      setFormError("Please select the booking date.");
      return;
    }

    if (!form.booking_time) {
      setFormError("Please select the booking time.");
      return;
    }

    if (!validTimes.includes(form.booking_time)) {
      setFormError("Please select a valid breakfast or lunch booking time.");
      return;
    }

    setIsSaving(true);

    try {
      const bookingData = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        guests: guestCount,
        booking_date: form.booking_date,
        booking_time: form.booking_time,
        special_requests: form.special_requests.trim() || null,
        status: form.status,
      };

      const url = editingBooking
        ? `/api/admin/bookings/${editingBooking.id}`
        : "/api/admin/bookings";

      const response = await fetch(url, {
        method: editingBooking ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      const result = (await response.json()) as SaveBookingResponse;

      if (!response.ok) {
        throw new Error(
          result.error || result.details || "The booking could not be saved.",
        );
      }

      setIsModalOpen(false);
      setEditingBooking(null);
      setForm(createEmptyForm());
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The booking could not be saved.";

      setFormError(`Could not save booking: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function updateBookingStatus(
    booking: Booking,
    status: "confirmed" | "cancelled",
  ) {
    setUpdatingBookingId(booking.id);

    try {
      const response = await fetch(
        `/api/admin/bookings/${booking.id}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        },
      );

      const result = (await response.json()) as StatusUpdateResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "The booking status could not be updated.",
        );
      }

      router.refresh();

      if (result.warning) {
        window.alert(result.warning);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The booking status could not be updated.";

      window.alert(message);
    } finally {
      setUpdatingBookingId(null);
    }
  }

  async function confirmBooking(booking: Booking) {
    const confirmed = window.confirm(
      `Confirm the booking for ${booking.name} on ${formatDateLabel(
        booking.booking_date,
      )} at ${formatTimeLabel(
        booking.booking_time.slice(0, 5),
      )} for ${booking.guests} ${
        booking.guests === 1 ? "guest" : "guests"
      }?\n\nThe customer will receive a confirmation email.`,
    );

    if (!confirmed) {
      return;
    }

    await updateBookingStatus(booking, "confirmed");
  }

  async function cancelBooking(booking: Booking) {
    const confirmed = window.confirm(
      `Cancel the booking for ${booking.name} on ${formatDateLabel(
        booking.booking_date,
      )} at ${formatTimeLabel(
        booking.booking_time.slice(0, 5),
      )}?\n\nThe customer will receive a cancellation email.`,
    );

    if (!confirmed) {
      return;
    }

    await updateBookingStatus(booking, "cancelled");
  }

  return (
    <div className="mt-6">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full">
            <label
              htmlFor="booking-search"
              className="text-sm font-semibold text-gray-800"
            >
              Search bookings
            </label>

            <div className="mt-2 flex gap-2">
              <input
                id="booking-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, email or request..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Clear
                </button>
              )}
            </div>

            <p className="mt-2 text-sm text-gray-500">
              {search
                ? `${filteredBookings.length} of ${bookings.length} bookings shown`
                : `${bookings.length} bookings`}
            </p>
          </div>

          <button
            type="button"
            onClick={openNewBooking}
            className="w-full shrink-0 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-700 sm:w-auto"
          >
            + New Booking
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {filteredBookings.map((booking) => (
          <div key={booking.id} className="relative">
            <BookingCard
              booking={booking}
              showDate={showDate}
              onEdit={openEditBooking}
              onConfirm={confirmBooking}
              onCancel={cancelBooking}
              isUpdating={updatingBookingId === booking.id}
            />

            {updatingBookingId === booking.id && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
                <p className="font-semibold text-gray-800">Updating…</p>
              </div>
            )}
          </div>
        ))}

        {bookings.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-800">
              {emptyMessage}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              New bookings will appear here automatically.
            </p>
          </div>
        )}

        {bookings.length > 0 && filteredBookings.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-800">
              No bookings found
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Try a different name, phone number or email.
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingBooking ? "Edit Booking" : "New Booking"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingBooking
                    ? "Update the booking details below."
                    : "Enter the customer booking details below."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-lg bg-gray-100 px-3 py-2 font-semibold text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveBooking} className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="booking-name"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Customer name *
                  </label>

                  <input
                    id="booking-name"
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateForm("name", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                    autoFocus
                  />
                </div>

                <div>
                  <label
                    htmlFor="booking-phone"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Phone *
                  </label>

                  <input
                    id="booking-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateForm("phone", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div>
                  <label
                    htmlFor="booking-email"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Email
                  </label>

                  <input
                    id="booking-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateForm("email", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div>
                  <label
                    htmlFor="booking-guests"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Guests *
                  </label>

                  <input
                    id="booking-guests"
                    type="number"
                    min="1"
                    max="120"
                    value={form.guests}
                    onChange={(event) =>
                      updateForm("guests", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div>
                  <label
                    htmlFor="booking-date"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Date *
                  </label>

                  <input
                    id="booking-date"
                    type="date"
                    value={form.booking_date}
                    onChange={(event) =>
                      updateBookingDate(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div>
                  <label
                    htmlFor="booking-time"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Time *
                  </label>

                  <select
                    id="booking-time"
                    value={form.booking_time}
                    onChange={(event) =>
                      updateForm("booking_time", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="">Select a time</option>

                    <optgroup label="Breakfast">
                      {availableTimes.breakfast.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="Lunch">
                      {availableTimes.lunch.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  <p className="mt-2 text-xs text-gray-500">
                    {isWeekend(form.booking_date)
                      ? "Weekend: Breakfast 8:00 am–11:00 am · Lunch 11:30 am–3:00 pm"
                      : "Monday–Friday: Breakfast 8:30 am–11:00 am · Lunch 11:30 am–2:30 pm"}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="booking-status"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Status
                  </label>

                  <select
                    id="booking-status"
                    value={form.status}
                    onChange={(event) =>
                      updateForm("status", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="booking-special-requests"
                  className="text-sm font-semibold text-gray-800"
                >
                  Special requests
                </label>

                <textarea
                  id="booking-special-requests"
                  rows={4}
                  value={form.special_requests}
                  onChange={(event) =>
                    updateForm("special_requests", event.target.value)
                  }
                  placeholder="Birthday, high chair, allergies or other notes..."
                  className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                />
              </div>

              {formError && (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl bg-gray-100 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving…"
                    : editingBooking
                      ? "Save Changes"
                      : "Save Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}