type ComingSoonProps = {
  title: string;
};

export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <h1 className="text-2xl font-semibold text-jj-grey dark:text-white mb-2">
        {title}
      </h1>
      <p className="text-jj-grey/70 dark:text-gray-400 max-w-md">
        This section is coming soon. Check back shortly as we continue building out the admin dashboard.
      </p>
    </div>
  );
}
