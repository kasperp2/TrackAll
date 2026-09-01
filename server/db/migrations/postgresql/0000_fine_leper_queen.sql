CREATE TABLE "entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"point" geometry(point),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "entities_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"avatar" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
