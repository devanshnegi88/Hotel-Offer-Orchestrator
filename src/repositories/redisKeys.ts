/**
 * Redis data model for hotel offers:
 *
 * 1. City price index — a Sorted Set per city:
 *      key:    hotels:{city}:index
 *      score:  price
 *      member: hotel name
 *
 *    Sorted Set members are unique by definition, so ZADD-ing the same
 *    hotel name twice updates its score rather than creating a duplicate
 *    entry — this is what gives us "hotel name uniqueness per city" for
 *    free. The score being price is what makes ZRANGEBYSCORE a native
 *    Redis range query, so min/max filtering never touches app code.
 *
 * 2. Hotel detail record — a Hash per hotel:
 *      key:    hotel:{city}:{slug(name)}
 *      fields: name, price, supplier, commissionPct
 *
 *    The sorted set only stores name + price (enough to filter and order).
 *    Full details live in the hash, fetched by the names the range query
 *    returns. Keying the hash by a slug of the name (not a random id)
 *    means writing the same hotel again overwrites the same hash — no
 *    separate lookup table is needed to find "the" record for a name.
 */

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeCity(city: string): string {
  return city.trim().toLowerCase();
}

export function cityIndexKey(city: string): string {
  return `hotels:${normalizeCity(city)}:index`;
}

export function hotelHashKey(city: string, hotelName: string): string {
  return `hotel:${normalizeCity(city)}:${slugify(hotelName)}`;
}
