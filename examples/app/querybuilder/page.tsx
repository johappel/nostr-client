'use client'
import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Code } from "lucide-react"

function Demo() {
  const [filters, setFilters] = useState([{ kinds: [1], limit: 20 }])
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          QueryBuilder Demo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Visual query builder for Nostr filters
          </p>
          <div className="flex gap-2">
            <Badge>kinds: [1]</Badge>
            <Badge variant="outline">limit: 20</Badge>
          </div>
          <pre className="text-xs bg-muted p-3 rounded">
            {JSON.stringify(filters, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const exampleCode = `import { QueryBuilder } from "@/components/nostr-ui/QueryBuilder"`
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">QueryBuilder</h1>
        <p className="text-muted-foreground">
          Visual query builder for constructing Nostr filters
        </p>
      </header>
      
      <div className="space-y-6">
        <Demo />
        
        <Card>
          <CardHeader>
            <CardTitle>Usage Example</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded">
              <code>{exampleCode}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
