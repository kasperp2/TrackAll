import { pgTable, text, serial, timestamp, geometry } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  avatar: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
})

export const entities = pgTable('entities', {
  id: serial().primaryKey(),
  identifier: text().notNull().unique(),
  name: text().notNull(),
  type: text().notNull(),
  point: geometry('point', { type: 'point', mode: 'xy', srid: 4326 }),
  createdAt: timestamp().notNull().defaultNow(),
})