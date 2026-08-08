import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type UpdateBookingStatusRequest = {
  status?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bookingId = Number(id);

    if (!Number.isInteger(bookingId) || bookingId < 1) {
      return NextResponse.json(
        { error: "Invalid booking ID." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as UpdateBookingStatusRequest;
    const requestedStatus = body.status?.trim().toLowerCase() ?? "";

    if (!["confirmed", "cancelled"].includes(requestedStatus)) {
      return NextResponse.json(
        { error: "Status must be confirmed or cancelled." },
        { status: 400 },
      );
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
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
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Could not find booking:", bookingError);

      return NextResponse.json(
        { error: "Booking could not be found." },
        { status: 404 },
      );
    }

    if (booking.status?.toLowerCase() === requestedStatus) {
      return NextResponse.json({
        success: true,
        status: requestedStatus,
        emailSent: false,
        message: `Booking is already ${requestedStatus}.`,
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        status: requestedStatus,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Could not update booking status:", updateError);

      return NextResponse.json(
        {
          error: `Booking status could not be updated: ${updateError.message}`,
        },
        { status: 500 },
      );
    }

    const customerEmail =
      typeof booking.email === "string" ? booking.email.trim() : "";

    if (!customerEmail) {
      return NextResponse.json({
        success: true,
        status: requestedStatus,
        emailSent: false,
        warning:
          "The booking status was updated, but the customer has no email address.",
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: true,
        status: requestedStatus,
        emailSent: false,
        warning:
          "The booking status was updated, but the email service is not configured.",
      });
    }

    const formattedDate = formatBookingDate(booking.booking_date);
    const formattedTime = formatBookingTime(booking.booking_time);
    const isConfirmed = requestedStatus === "confirmed";

    const subject = isConfirmed
      ? "Your booking is confirmed – Walter's River Cafe"
      : "Your booking has been cancelled – Walter's River Cafe";

    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #111827;">
        <h1 style="font-size: 26px; margin-bottom: 8px;">
          Walter's River Cafe
        </h1>

        <h2 style="font-size: 21px; margin-top: 24px; margin-bottom: 12px;">
          ${
            isConfirmed
              ? "Your booking is confirmed"
              : "Your booking has been cancelled"
          }
        </h2>

        <p style="font-size: 16px; line-height: 1.6;">
          Hi ${escapeHtml(booking.name)},
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          ${
            isConfirmed
              ? "We are pleased to confirm your booking at Walter's River Cafe."
              : "This email confirms that your booking at Walter's River Cafe has been cancelled."
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

        ${
          isConfirmed
            ? `
              <p style="margin-top: 24px; font-size: 15px; line-height: 1.6;">
                Please reply to this email if you need to make any changes.
              </p>

              <p style="margin-top: 24px; font-size: 15px; line-height: 1.6;">
                We look forward to welcoming you.
              </p>
            `
            : `
              <p style="margin-top: 24px; font-size: 15px; line-height: 1.6;">
                Please reply to this email if you believe the booking was cancelled in error or if you would like to arrange another booking.
              </p>
            `
        }

        <p style="margin-top: 24px; font-size: 15px; line-height: 1.6;">
          Walter's River Cafe
        </p>

        <p style="margin-top: 28px; color: #6b7280; font-size: 12px;">
          Booking reference: ${escapeHtml(String(booking.id))}
        </p>
      </div>
    `;

    const emailResult = await resend.emails.send({
      from: "Walter's River Cafe <onboarding@resend.dev>",
      to: [customerEmail],
      replyTo: restaurantEmail,
      subject,
      html: customerEmailHtml,
    });

    if (emailResult.error) {
      console.error("Customer status email error:", emailResult.error);

      return NextResponse.json({
        success: true,
        status: requestedStatus,
        emailSent: false,
        warning:
          "The booking status was updated, but the customer email could not be sent.",
      });
    }

    return NextResponse.json({
      success: true,
      status: requestedStatus,
      emailSent: true,
    });
  } catch (error) {
    console.error("Booking status API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while updating the booking.",
        details:
          error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 },
    );
  }
}