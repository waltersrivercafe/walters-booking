type BookingCardProps = {
  name: string;
  guests: number;
};

export default function BookingCard({
  name,
  guests,
}: BookingCardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-xl font-bold text-gray-900">
        {name}
      </h3>

      <p className="mt-1 text-gray-600">
        {guests} {guests === 1 ? "guest" : "guests"}
      </p>
    </div>
  );
}