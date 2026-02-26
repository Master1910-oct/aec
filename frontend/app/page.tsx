import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-extrabold text-center">
        Smart Emergency Allocation System
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { href: "/admin", label: "Admin Dashboard" },
          { href: "/ambulance", label: "Ambulance Panel" },
          { href: "/hospital", label: "Hospital Panel" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold text-center">
              {item.label}
            </h2>
          </Link>
        ))}
      </div>
    </div>
  );
}