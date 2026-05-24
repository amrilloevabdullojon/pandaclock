export function Stepper({ current, steps }: { current: number; steps: string[] }) {
  return (
    <ol className="flex items-center justify-center gap-2">
      {steps.map((label, idx) => {
        const stepNumber = idx + 1;
        const isDone = stepNumber < current;
        const isActive = stepNumber === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <div
              className={[
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                isActive ? "bg-primary-500 text-white" : "",
                isDone ? "bg-primary-100 text-primary-700" : "",
                !isActive && !isDone ? "bg-neutral-100 text-neutral-400" : "",
              ].join(" ")}
            >
              {stepNumber}
            </div>
            <span
              className={[
                "text-sm font-semibold",
                isActive ? "text-neutral-900" : "text-neutral-400",
              ].join(" ")}
            >
              {label}
            </span>
            {stepNumber < steps.length ? (
              <span className="mx-2 h-px w-8 bg-neutral-200" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
