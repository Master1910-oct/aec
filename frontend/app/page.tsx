export default function Home() {
  return (
    <div className="p-10 space-y-4">
      <h1 className="text-3xl font-bold">
        Smart Emergency Allocation System
      </h1>

      <div className="space-x-4">
        <a href="/admin" className="text-blue-600 underline">
          Admin Dashboard
        </a>
        <a href="/ambulance" className="text-blue-600 underline">
          Ambulance Panel
        </a>
        <a href="/hospital" className="text-blue-600 underline">
          Hospital Panel
        </a>
      </div>
    </div>
  );
}