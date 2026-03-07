export function BusinessCommandCenter({ userId }: { userId: string }) {
  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-2">Business Command Center</h2>
      <p className="text-sm text-muted-foreground">
        This module is frozen for v1 revenue focus. User: {userId}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Use Launch Blueprint, Brand Generator, and Evidence workflow for current production scope.
      </p>
    </div>
  )
}
