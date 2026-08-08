import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type BookingPayload = {
  name?: string;
  phone?: string;
  email?: string;
  guests?: number | string;
  booking_date?: string;
  booking_time?: string;
  special_requests?: string | null;
  status?: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedStatuses = new Set([
  "confirmed",
  "pending",
  "completed",
  "cancelled",
]);

function validatePayload(body: BookingPayload) {
  const name = body.name?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const bookingDate = body.booking_date?.trim() ?? "";
  const bookingTime = body.booking_time?.trim() ?? "";
  const specialRequests =
    typeof body.special_requests === "string"
      ? body.special_requests.trim()
      : "";
  const status = body.status?.trim().toLowerCase() ?? "";
  const guests = Number(body.guests);

  if (!name) return { error: "Please enter the customer name." };
  if (!phone) return { error: "Please enter a phone number." };
  if (!Number.isInteger(guests) || guests < 1 || guests > 120) {
    return { error: "Guests must be between 1 and 120." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    return { error: "Please select a valid booking date." };
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(bookingTime)) {
    return { error: "Please select a valid booking time." };
  }
  if (!allowedStatuses.has(status)) {
    return { error: "Please select a valid booking status." };
  }

  return {
    data: {
      name,
      phone,
      email,
      guests,
      booking_date: bookingDate,
      booking_time: bookingTime.slice(0, 5),
      special_requests: specialRequests || null,
      status,
    },
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bookingId = Number(id);

    if (!Number.isInteger(bookingId) || bookingId < 1) {
      return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 });
    }

    const body = (await request.json()) as BookingPayload;
    const validated = validatePayload(body);

    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .update(validated.data)
      .eq("id", bookingId)
      .select("*")
      .single();

    if (error || !booking) {
      console.error("Admin update booking error:", error);
      return NextResponse.json(
        {
          error: "The booking could not be updated.",
          details: error?.message ?? "No booking was returned.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error("Admin update booking API error:", error);
    return NextResponse.json(
      {
        error: "Something went wrong while updating the booking.",
        details: error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 },
    );
  }
}