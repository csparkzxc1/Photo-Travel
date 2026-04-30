import {
  boolean,
  char,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// PostGIS doesn't have a built-in Drizzle type yet, so we declare custom ones
// that round-trip as WKT strings. The DB columns are real GEOMETRY/GEOGRAPHY,
// so SRID 4326 is enforced by the migration's CHECK / type modifiers.
const geometryMultiPolygon = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geometry(MultiPolygon, 4326)';
  },
});

const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography(Point, 4326)';
  },
});

export const countries = pgTable('countries', {
  code: char('code', { length: 2 }).primaryKey(),
  nameKo: text('name_ko').notNull(),
  nameEn: text('name_en').notNull(),
  flagEmoji: text('flag_emoji').notNull(),
  totalRegions: integer('total_regions').notNull().default(0),
  supportedLevel: smallint('supported_level').notNull().default(1),
});

export const regions = pgTable(
  'regions',
  {
    id: text('id').primaryKey(),
    countryCode: char('country_code', { length: 2 })
      .notNull()
      .references(() => countries.code),
    level: smallint('level').notNull(),
    parentId: text('parent_id'),
    nameKo: text('name_ko').notNull(),
    nameLocal: text('name_local').notNull(),
    nameEn: text('name_en').notNull(),
    population: integer('population'),
    areaKm2: doublePrecision('area_km2'),
    geom: geometryMultiPolygon('geom').notNull(),
  },
  (t) => ({
    countryLevelIdx: index('regions_country_level_idx').on(t.countryCode, t.level),
    parentIdx: index('regions_parent_idx').on(t.parentId),
  })
);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  nickname: text('nickname').notNull(),
  profileImage: text('profile_image'),
  plan: text('plan').notNull().default('free'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  settings: jsonb('settings').notNull().default({}),
});

export const photos = pgTable(
  'photos',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cloudUri: text('cloud_uri'),
    takenAt: timestamp('taken_at', { withTimezone: true }).notNull(),
    location: geographyPoint('location').notNull(),
    accuracyM: real('accuracy_m'),
    regionId: text('region_id').references(() => regions.id),
    tripId: uuid('trip_id'),
    exif: jsonb('exif'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userTakenIdx: index('photos_user_taken_idx').on(t.userId, t.takenAt.desc()),
    userRegionIdx: index('photos_user_region_idx').on(t.userId, t.regionId),
  })
);

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    regionIds: text('region_ids').array().notNull().default([]),
    representativePhotoId: text('representative_photo_id'),
    photoCount: integer('photo_count').notNull().default(0),
    videoCount: integer('video_count').notNull().default(0),
    isSignificant: boolean('is_significant').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userStartIdx: index('trips_user_start_idx').on(t.userId, t.startDate.desc()),
  })
);

export const visits = pgTable(
  'visits',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    regionId: text('region_id')
      .notNull()
      .references(() => regions.id),
    firstVisitedAt: timestamp('first_visited_at', { withTimezone: true }).notNull(),
    lastVisitedAt: timestamp('last_visited_at', { withTimezone: true }).notNull(),
    totalPhotos: integer('total_photos').notNull().default(0),
    totalTrips: integer('total_trips').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.regionId] }),
  })
);

export const friendships = pgTable(
  'friendships',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    friendId: uuid('friend_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.friendId] }),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type Region = typeof regions.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Visit = typeof visits.$inferSelect;
