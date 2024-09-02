import {
  EntityManager,
  FindOptionsOrder,
  FindOptionsSelect,
  FindOptionsWhere,
  MoreThan,
  Repository,
} from "typeorm";

export async function foreachInRepo<T>({
  repo,
  handler,
  criteria,
  order,
  isSerial,
  chunkSize,
  select,
}: {
  repo: Repository<T & { id: number }>;
  handler: (entity: T) => Promise<unknown>;
  criteria?: FindOptionsWhere<T>;
  order?: FindOptionsOrder<T & { id: number }>;
  isSerial?: boolean;
  chunkSize?: number;
  select?: FindOptionsSelect<T & { id: number }>;
}) {
  let lastId: number | null = null;

  while (true) {
    const entities = await repo.find({
      where: lastId
        ? ({ ...(criteria ?? {}), id: MoreThan(lastId) } as any)
        : criteria,
      order,
      take: chunkSize ?? 100,
      select,
    });
    if (entities.length === 0) {
      break;
    }
    lastId = entities[entities.length - 1].id;

    if (isSerial) {
      for (let i = 0; i < entities.length; i += 1) {
        await handler(entities[i]);
      }
    } else {
      await Promise.all(entities.map((entity) => handler(entity)));
    }
  }
}

// Will start transaction if not specified
export async function withTransaction<T>(
  defaultManager: EntityManager,
  txManager: EntityManager | null | undefined,
  handler: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  if (txManager) {
    return await handler(txManager);
  }

  return await defaultManager.transaction(handler);
}

export function formatSortableInt(str: string, digits = 80) {
  if (str.charAt(0) === "-") {
    return `-${str.substring(1).padStart(digits, "0")}`;
  }
  return str.padStart(digits, "0");
}

export function parseSortableInt(str: string) {
  if (str.charAt(0) === "-") {
    const val = str.substring(1).replace(/^0*/, "");
    if (val === "") {
      return "0";
    }
    return `-${val}`;
  }
  const val = str.replace(/^0*/, "");
  if (val === "") {
    return "0";
  }
  return val;
}

export function formatSortable(str: string, digits = 80) {
  const [l, r] = str.split(".");

  const lRes = formatSortableInt(l, digits);
  if (r === undefined) {
    return lRes;
  }

  return `${lRes}.${r}`;
}

export function parseSortable(str: string) {
  const [l, r] = str.split(".");

  const lRes = parseSortableInt(l);
  if (r === undefined) {
    return lRes;
  }

  return `${lRes}.${r}`;
}
