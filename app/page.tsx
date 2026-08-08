"use client";

import { type FormEvent, useState } from "react";
import DatePicker from "react-datepicker";
import { addDays, addMonths, format } from "date-fns";

function createTimes(start: string, end: string) {
  const times: string[] = [];
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);

  let currentMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  while (currentMinutes <= endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const minute = currentMinutes % 60;

    times.push(
      `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`,
    );

    currentMinutes += 15;
  }

  return times;
}

function formatTimeLabel(time: string) {
  const [hoursText, minutesText] = time.split(":");
  const hours = Number(hoursText);
  const suffix = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutesText} ${suffix}`;
}

type BookingApiResponse = {
  success?: boolean;
  bookingSaved?: boolean;
  emailSent?: boolean;
  restaurantEmailSent?: boolean;
  customerEmailSent?: boolean;
  isLargeBooking?: boolean;
  warning?: string;
  error?: string;
  details?: string;
};

type SubmitStage = "idle" | "submitting" | "success";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [guests, setGuests] = useState("1");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const [submitStage, setSubmitStage] = useState<SubmitStage>("idle");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "warning" | "error" | ""
  >("");

  const isSubmitting = submitStage === "submitting";
  const isSuccess = submitStage === "success";

  const isWeekend =
    selectedDate !== null &&
    (selectedDate.getDay() === 0 || selectedDate.getDay() === 6);

  const breakfastTimes = selectedDate
    ? createTimes(isWeekend ? "08:00" : "08:30", "11:00")
    : [];

  const lunchTimes = selectedDate
    ? createTimes("11:30", isWeekend ? "15:00" : "14:30")
    : [];

  const isLargeBooking = guests === "13+";

  function clearMessage() {
    if (submitStage === "idle") {
      setMessage("");
      setMessageType("");
    }
  }

  function resetForm() {
    setSelectedDate(null);
    setSelectedTime("");
    setGuests("1");
    setName("");
    setPhone("");
    setEmail("");
    setSpecialRequests("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isSuccess) {
      return;
    }

    setMessage("");
    setMessageType("");

    if (
      !selectedDate ||
      !selectedTime ||
      !name.trim() ||
      !phone.trim() ||
      !email.trim()
    ) {
      setMessage("Please complete all required fields.");
      setMessageType("error");
      return;
    }

    setSubmitStage("submitting");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_date: format(selectedDate, "yyyy-MM-dd"),
          booking_time: selectedTime,
          guests: isLargeBooking ? 13 : Number(guests),
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          special_requests: specialRequests.trim() || null,
        }),
      });

      const result = (await response.json()) as BookingApiResponse;

      if (!response.ok) {
        setMessage(
          result.error ||
            result.details ||
            "Booking could not be saved. Please try again.",
        );
        setMessageType("error");
        setSubmitStage("idle");
        return;
      }

      if (result.warning) {
        setMessage(
          isLargeBooking
            ? "Your booking request was saved, but one or more notification emails could not be sent. Please call Walter's River Cafe if your booking is urgent."
            : "Your booking was saved, but one or more notification emails could not be sent. Please call Walter's River Cafe if your booking is urgent.",
        );
        setMessageType("warning");
      } else {
        setMessage(
          isLargeBooking
            ? "Your booking request has been sent successfully. We will contact you shortly to confirm availability."
            : "Your booking has been confirmed successfully.",
        );
        setMessageType("success");
      }

      setSubmitStage("success");
      resetForm();

      window.setTimeout(() => {
        setSubmitStage("idle");
      }, 1800);
    } catch (error) {
      console.error("Booking submission error:", error);

      setMessage(
        "We could not process your booking. Please check your internet connection and try again.",
      );
      setMessageType("error");
      setSubmitStage("idle");
    }
  }

  const messageClasses =
    messageType === "success"
      ? "border border-green-200 bg-green-50 text-green-800"
      : messageType === "warning"
        ? "border border-amber-200 bg-amber-50 text-amber-900"
        : "border border-red-200 bg-red-50 text-red-700";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-xl px-6 py-12">
        <h1 className="text-center text-4xl font-bold text-[#0B1F3A]">
          Walter&apos;s River Cafe
        </h1>

        <p className="mt-3 text-center text-gray-600">
          Reserve your table online
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-2xl bg-white p-6 shadow"
        >
          <label
            htmlFor="booking-date"
            className="mb-2 block font-medium text-gray-900"
          >
            Date *
          </label>

          <DatePicker
            id="booking-date"
            selected={selectedDate}
            onChange={(date: Date | null) => {
              setSelectedDate(date);
              setSelectedTime("");
              clearMessage();
            }}
            minDate={addDays(new Date(), 1)}
            maxDate={addMonths(new Date(), 3)}
            dateFormat="dd/MM/yyyy"
            placeholderText="DD/MM/YYYY"
            wrapperClassName="w-full"
            className="mb-5 w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none focus:border-[#0B1F3A] focus:ring-2 focus:ring-blue-100"
          />

          <label
            htmlFor="booking-time"
            className="mb-2 block font-medium text-gray-900"
          >
            Time *
          </label>

          <select
            id="booking-time"
            value={selectedTime}
            onChange={(event) => {
              setSelectedTime(event.target.value);
              clearMessage();
            }}
            disabled={!selectedDate || isSubmitting || isSuccess}
            className="mb-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#0B1F3A] focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
          >
            <option value="">
              {selectedDate ? "Select a time" : "Choose a date first"}
            </option>

            {selectedDate && (
              <>
                <optgroup label="Breakfast">
                  {breakfastTimes.map((time) => (
                    <option key={time} value={time}>
                      {formatTimeLabel(time)}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="Lunch">
                  {lunchTimes.map((time) => (
                    <option key={time} value={time}>
                      {formatTimeLabel(time)}
                    </option>
                  ))}
                </optgroup>
              </>
            )}
          </select>

          <p className="mb-5 text-xs text-gray-500">
            {selectedDate
              ? isWeekend
                ? "Weekend bookings: Breakfast 8:00 am–11:00 am · Lunch 11:30 am–3:00 pm"
                : "Monday–Friday bookings: Breakfast 8:30 am–11:00 am · Lunch 11:30 am–2:30 pm"
              : "Select a date to view available booking times."}
          </p>

          <label
            htmlFor="booking-guests"
            className="mb-2 block font-medium text-gray-900"
          >
            Guests *
          </label>

          <select
            id="booking-guests"
            value={guests}
            onChange={(event) => {
              setGuests(event.target.value);
              clearMessage();
            }}
            disabled={isSubmitting || isSuccess}
            className="mb-5 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-[#0B1F3A] focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
          >
            {[...Array(12)].map((_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}

            <option value="13+">13+</option>
          </select>

          <label
            htmlFor="booking-name"
            className="mb-2 block font-medium text-gray-900"
          >
            Name *
          </label>

          <input
            id="booking-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearMessage();
            }}
            disabled={isSubmitting || isSuccess}
            type="text"
            autoComplete="name"
            placeholder="Your name"
            className="mb-5 w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#0B1F3A] focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
          />

          <label
            htmlFor="booking-phone"
            className="mb-2 block font-medium text-gray-900"
          >
            Phone *
          </label>

          <input
            id="booking-phone"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              clearMessage();
            }}
            disabled={isSubmitting || isSuccess}
            type="tel"
            autoComplete="tel"
            placeholder="04xx xxx xxx"
            className="mb-5 w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#0B1F3A] focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
          />

          <label
            htmlFor="booking-email"
            className="mb-2 block font-medium text-gray-900"
          >
            Email *
          </label>

          <input
            id="booking-email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearMessage();
            }}
            disabled={isSubmitting || isSuccess}
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            className="mb-5 w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#0B1F3A] focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
          />

          <label
            htmlFor="booking-special-requests"
            className="mb-2 block font-medium text-gray-900"
          >
            Special Requests
          </label>

          <textarea
            id="booking-special-requests"
            value={specialRequests}
            onChange={(event) => {
              setSpecialRequests(event.target.value);
              clearMessage();
            }}
            disabled={isSubmitting || isSuccess}
            rows={4}
            placeholder="Window seat, high chair, birthday..."
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#0B1F3A] focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
          />

          <p className="mb-6 mt-2 text-xs text-gray-500">
            Requests are subject to availability and cannot be guaranteed.
          </p>

          {isLargeBooking && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              For bookings of 13 or more guests, we&apos;ll review your request
              and contact you shortly to confirm availability.
            </div>
          )}

          {message && (
            <div
              className={`mb-4 rounded-lg p-4 text-sm font-medium ${messageClasses}`}
              role="status"
              aria-live="polite"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className={`flex w-full items-center justify-center gap-3 rounded-xl py-4 text-lg font-semibold text-white transition-all duration-200 ${
              isSuccess
                ? "bg-green-600"
                : "bg-[#0B1F3A] hover:bg-[#08172B] active:scale-[0.99]"
            } disabled:cursor-not-allowed`}
          >
            {isSubmitting && (
              <span
                className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden="true"
              />
            )}

            {isSuccess && (
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-green-600"
                aria-hidden="true"
              >
                ✓
              </span>
            )}

            {isSubmitting
              ? isLargeBooking
                ? "Submitting your request..."
                : "Reserving your table..."
              : isSuccess
                ? isLargeBooking
                  ? "Request Sent"
                  : "Booking Confirmed"
                : isLargeBooking
                  ? "Request Booking"
                  : "Reserve Table"}
          </button>
        </form>
      </div>
    </main>
  );
}