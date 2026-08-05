import { trpc } from "../lib/trpc";

interface CategoryPillsProps {
  active: string;
  onChange: (slug: string) => void;
}

export default function CategoryPills({ active, onChange }: CategoryPillsProps) {
  const { data: categories } = trpc.categories.list.useQuery();

  const items = [{ id: 0, name: "Todos", slug: "todos" }, ...(categories ?? [])];

  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => onChange(cat.slug)}
          className={`shrink-0 whitespace-nowrap rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
            active === cat.slug
              ? "border-coffee bg-coffee text-cream"
              : "border-coffee-light/30 bg-white text-ink/70 hover:border-coffee hover:text-coffee"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
