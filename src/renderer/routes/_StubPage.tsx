export default function StubPage({
  title,
  description
}: {
  title: string
  description: string
}) {
  return (
    <div className="mx-auto max-w-[780px]">
      <h1 className="font-serif text-[34px] font-medium leading-tight tracking-tight text-text">
        {title}
      </h1>
      <p className="mt-3 text-[13.5px] text-text-muted">{description}</p>
    </div>
  )
}
