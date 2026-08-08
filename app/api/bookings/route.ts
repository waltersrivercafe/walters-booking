import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CreateBookingRequest = {
  booking_date?: string;
  booking_time?: string;
  guests?: number | string;
  name?: string;
  phone?: string;
  email?: string;
  special_requests?: string;
};

const resend = new Resend(process.env.RESEND_API_KEY);

const restaurantEmail = "waltersrivercafewa@gmail.com";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  const [hoursText, minutesText = "00"] = timeString.split(":");
  const hours = Number(hoursText);
  const minutes = minutesText.slice(0, 2).padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes} ${suffix}`;
}

function isValidDate(dateString: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidTime(timeString: string) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(timeString);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBookingRequest;

    const bookingDate = body.booking_date?.trim() ?? "";
    const bookingTime = body.booking_time?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const specialRequests = body.special_requests?.trim() ?? "";
    const guests = Number(body.guests);

    if (!name) {
      return NextResponse.json(
        { error: "Please enter your name." },
        { status: 400 },
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Please enter your phone number." },
        { status: 400 },
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(guests) || guests < 1) {
      return NextResponse.json(
        { error: "Please select a valid number of guests." },
        { status: 400 },
      );
    }

    if (!isValidDate(bookingDate)) {
      return NextResponse.json(
        { error: "Please select a valid booking date." },
        { status: 400 },
      );
    }

    if (!isValidTime(bookingTime)) {
      return NextResponse.json(
        { error: "Please select a valid booking time." },
        { status: 400 },
      );
    }

    const status = guests >= 13 ? "pending" : "confirmed";

    const { data: booking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        booking_date: bookingDate,
        booking_time: bookingTime,
        guests,
        name,
        phone,
        email,
        special_requests: specialRequests || null,
        status,
      })
      .select(
        `
          id,
          booking_date,
          booking_time,
          guests,
          name,
          phone,
          email,
          special_requests,
          status
        `,
      )
      .single();

if (insertError || !booking) {
  console.error("Could not save booking:", insertError);

  return NextResponse.json(
    {
      error: "Could not save booking.",
      details: {
        message: insertError?.message ?? "No booking was returned.",
        code: insertError?.code ?? null,
        databaseDetails: insertError?.details ?? null,
        hint: insertError?.hint ?? null,
      },
    },
    { status: 500 },
  );
}

    const formattedDate = formatBookingDate(booking.booking_date);
    const formattedTime = formatBookingTime(booking.booking_time);
    const isPending = booking.status === "pending";

    let restaurantEmailSent = false;
    let customerEmailSent = false;
    const emailWarnings: string[] = [];

    if (process.env.RESEND_API_KEY) {
      const restaurantEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #111827;">
          <h1 style="font-size: 26px; margin-bottom: 8px;">
            New Booking
          </h1>

          <p style="font-size: 16px; line-height: 1.6;">
            A new booking has been submitted through the Walter's River Cafe website.
          </p>

          <div style="margin-top: 24px; padding: 20px; background: #f3f4f6; border-radius: 10px;">
            <p style="margin: 0 0 10px;">
              <strong>Status:</strong>
              ${escapeHtml(
                isPending ? "Pending approval" : "Confirmed",
              )}
            </p>

            <p style="margin: 0 0 10px;">
              <strong>Date:</strong> ${escapeHtml(formattedDate)}
            </p>

            <p style="margin: 0 0 10px;">
              <strong>Time:</strong> ${escapeHtml(formattedTime)}
            </p>

            <p style="margin: 0 0 10px;">
              <strong>Guests:</strong> ${booking.guests}
            </p>

            <p style="margin: 0 0 10px;">
              <strong>Name:</strong> ${escapeHtml(booking.name)}
            </p>

            <p style="margin: 0 0 10px;">
              <strong>Phone:</strong> ${escapeHtml(booking.phone)}
            </p>

            <p style="margin: 0 0 10px;">
              <strong>Email:</strong> ${escapeHtml(booking.email)}
            </p>

            <p style="margin: 0;">
              <strong>Special requests:</strong>
              ${escapeHtml(booking.special_requests || "None")}
            </p>
          </div>

          <p style="margin-top: 28px; color: #6b7280; font-size: 12px;">
            Booking reference: ${escapeHtml(String(booking.id))}
          </p>
        </div>
      `;

      const restaurantResult = await resend.emails.send({
        from: "Walter's River Cafe <onboarding@resend.dev>",
        to: [restaurantEmail],
        replyTo: booking.email,
        subject: isPending
          ? `New booking requires approval – ${booking.name}, ${booking.guests} guests`
          : `New confirmed booking – ${booking.name}, ${booking.guests} guests`,
        html: restaurantEmailHtml,
      });

      if (restaurantResult.error) {
        console.error(
          "Restaurant notification email error:",
          restaurantResult.error,
        );

        emailWarnings.push(
          "The booking was saved, but the restaurant notification email could not be sent.",
        );
      } else {
        restaurantEmailSent = true;
      }

      const customerSubject = isPending
        ? "We received your booking request – Walter's River Cafe"
        : "Your booking is confirmed – Walter's River Cafe";

      const customerEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #111827;">
          <h1 style="font-size: 26px; margin-bottom: 8px;">
            Walter's River Cafe
          </h1>

          <h2 style="font-size: 21px; margin-top: 24px; margin-bottom: 12px;">
            ${
              isPending
                ? "We received your booking request"
                : "Your booking is confirmed"
            }
          </h2>

          <p style="font-size: 16px; line-height: 1.6;">
            Hi ${escapeHtml(booking.name)},
          </p>

          <p style="font-size: 16px; line-height: 1.6;">
            ${
              isPending
                ? "Thank you for your booking request. Because your booking is for 13 or more guests, our team will review it and contact you to confirm availability."
                : "Thank you for booking with Walter's River Cafe. Your booking is confirmed."
            }
          </p>

          <div style="margin-top: 24px; padding: 20px; background: #f3f4f6; border-radius: 10px;">
            <p style="margin: 0 0 10px;">
              <strong>Date:</strong> ${escapeHtml(formattedDate)}
            </p>

            <p style="margin: 0 0 10px;">
              <strong>Time:</strong> ${escapeHtml(formattedTime)}
            </p>

            <p style="margin: 0 0 10px;">
              <strong>Guests:</strong> ${booking.guests}
            </p>

            <p style="margin: 0;">
              <strong>Name:</strong> ${escapeHtml(booking.name)}
            </p>
          </div>

          <p style="margin-top: 24px; font-size: 15px; line-height: 1.6;">
            ${
              isPending
                ? "Please note that this booking is not confirmed until you receive a confirmation email from our team."
                : "Please reply to this email if you need to make any changes."
            }
          </p>

          <p style="margin-top: 24px; font-size: 15px; line-height: 1.6;">
            Walter's River Cafe
          </p>

          <p style="margin-top: 28px; color: #6b7280; font-size: 12px;">
            Booking reference: ${escapeHtml(String(booking.id))}
          </p>
        </div>
      `;

      const customerResult = await resend.emails.send({
        from: "Walter's River Cafe <onboarding@resend.dev>",
        to: [booking.email],
        replyTo: restaurantEmail,
        subject: customerSubject,
        html: customerEmailHtml,
      });

      if (customerResult.error) {
        console.error("Customer booking email error:", customerResult.error);

        emailWarnings.push(
          "The booking was saved, but the customer email could not be sent.",
        );
      } else {
        customerEmailSent = true;
      }
    } else {
      emailWarnings.push(
        "The booking was saved, but the email service is not configured.",
      );
    }

    return NextResponse.json(
      {
        success: true,
        booking,
        status: booking.status,
        restaurantEmailSent,
        customerEmailSent,
        warning:
          emailWarnings.length > 0 ? emailWarnings.join(" ") : undefined,
      },
      { status: 201 },
    );
} catch (error) {
  console.error("Booking API error:", error);

  const errorDetails =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          cause:
            "cause" in error && error.cause
              ? String(error.cause)
              : null,
          stack: error.stack,
        }
      : {
          value: String(error),
        };

  return NextResponse.json(
    {
      error: "Could not save booking.",
      details: errorDetails,
    },
    { status: 500 },
  );
}
}