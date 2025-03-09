import { NextResponse } from "next/server"
import { createTables, seedInitialData } from "@/lib/db-schema"

// Setup database tables and initial data
export async function POST() {
  try {
    // Create database tables
    const tablesResult = await createTables()

    if (!tablesResult.success) {
      return NextResponse.json({ error: "Failed to create database tables" }, { status: 500 })
    }

    // Seed initial data
    const seedResult = await seedInitialData()

    if (!seedResult.success) {
      return NextResponse.json({ error: "Failed to seed initial data" }, { status: 500 })
    }

    return NextResponse.json({ message: "Database setup completed successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error during database setup:", error)
    return NextResponse.json({ error: "Database setup failed" }, { status: 500 })
  }
}

