"use client";

import { FormEvent, useState } from "react";
import DatePicker from "react-datepicker";
import { addDays, addMonths, format } from "date-fns";
import { supabase } from "@/lib/supabase";

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
        .padStart(2, "0")}`
    );

    currentMinutes += 15;
  }

  return times;
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [guests, setGuests] = useState("1");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!selectedDate || !selectedTime || !name || !phone || !email) {
      setMessage("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("bookings").insert({
      booking_date: format(selectedDate, "yyyy-MM-dd"),
      booking_time: selectedTime,
      guests: isLargeBooking ? 13 : Number(guests),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      special_requests: specialRequests.trim() || null,
      status: isLargeBooking ? "Pending" : "Confirmed",
    });

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      setMessage(`Booking could not be saved: ${error.message}`);
      return;
    }

    setMessage(
      isLargeBooking
        ? "Booking request sent successfully."
        : "Booking confirmed successfully."
    );

    setSelectedDate(null);
    setSelectedTime("");
    setGuests("1");
    setName("");
    setPhone("");
    setEmail("");
    setSpecialRequests("");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-xl px-6 py-12">
        <h1 className="text-center text-4xl font-bold text-gray-900">
          Walter&apos;s River Cafe
        </h1>

        <p className="mt-3 text-center text-gray-600">
          Reserve your table online
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-2xl bg-white p-6 shadow"
        >
          <label className="mb-2 block font-medium">Date *</label>

          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => {
              setSelectedDate(date);
              setSelectedTime("");
            }}
            minDate={addDays(new Date(), 1)}
            maxDate={addMonths(new Date(), 3)}
            dateFormat="dd/MM/yyyy"
            placeholderText="DD/MM/YYYY"
            wrapperClassName="w-full"
            className="mb-5 w-full rounded-lg border border-gray-300 p-3"
          />

          <label className="mb-2 block font-medium">Time *</label>

          <select
            value={selectedTime}
            onChange={(event) => setSelectedTime(event.target.value)}
            disabled={!selectedDate}
            className="mb-5 w-full rounded-lg border border-gray-300 p-3 disabled:bg-gray-100"
          >
            <option value="">
              {selectedDate ? "Select a time" : "Choose a date first"}
            </option>

            {selectedDate && (
              <>
                <optgroup label="Breakfast">
                  {breakfastTimes.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="Lunch">
                  {lunchTimes.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </optgroup>
              </>
            )}
          </select>

          <label className="mb-2 block font-medium">Guests *</label>

          <select
            value={guests}
            onChange={(event) => setGuests(event.target.value)}
            className="mb-5 w-full rounded-lg border border-gray-300 p-3"
          >
            {[...Array(12)].map((_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}

            <option value="13+">13+</option>
          </select>

          <label className="mb-2 block font-medium">Name *</label>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            type="text"
            placeholder="Your name"
            className="mb-5 w-full rounded-lg border border-gray-300 p-3"
          />

          <label className="mb-2 block font-medium">Phone *</label>

          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            type="tel"
            placeholder="04xx xxx xxx"
            className="mb-5 w-full rounded-lg border border-gray-300 p-3"
          />

          <label className="mb-2 block font-medium">Email *</label>

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="you@email.com"
            className="mb-5 w-full rounded-lg border border-gray-300 p-3"
          />

          <label className="mb-2 block font-medium">
            Special Requests
          </label>

          <textarea
            value={specialRequests}
            onChange={(event) => setSpecialRequests(event.target.value)}
            rows={4}
            placeholder="Window seat, high chair, birthday..."
            className="w-full rounded-lg border border-gray-300 p-3"
          />

          <p className="mb-6 mt-2 text-xs text-gray-500">
            Requests are subject to availability and cannot be guaranteed.
          </p>

          {isLargeBooking && (
            <div className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
              For bookings of 13 or more guests, we&apos;ll review your request
              and contact you shortly to confirm availability.
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-lg bg-gray-100 p-4 text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-black py-4 text-lg font-semibold text-white hover:bg-gray-800 disabled:bg-gray-400"
          >
            {isSubmitting
              ? "Saving..."
              : isLargeBooking
                ? "Request Booking"
                : "Reserve Table"}
          </button>
        </form>
      </div>
    </main>
  );
}