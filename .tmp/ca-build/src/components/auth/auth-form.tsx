'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthForm() {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Continue via email</CardTitle>
        <CardDescription>Use a secure link to continue your ForgePilot session.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/continue">Confirm email</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
