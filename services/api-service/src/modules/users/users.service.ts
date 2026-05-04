import type { User } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import type { CreateUserInput, UpdateUserInput } from "./users.validation";

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

function isRecordNotFound(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025"
  );
}

export async function createUser(payload: CreateUserInput): Promise<User> {
  const { role, ...rest } = payload;

  try {
    return await prisma.user.create({
      data: {
        ...rest,
        role: role ?? UserRole.USER,
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw ApiError.conflict("Email is already registered.");
    }
    throw err;
  }
}

export async function listUsers(): Promise<User[]> {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserById(id: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (user === null) {
    throw ApiError.notFound("User not found.");
  }

  return user;
}

export async function updateUser(
  id: string,
  payload: UpdateUserInput,
): Promise<User> {
  try {
    return await prisma.user.update({
      where: { id },
      data: {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.email !== undefined && { email: payload.email }),
        ...(payload.role !== undefined && { role: payload.role }),
      },
    });
  } catch (err) {
    if (isRecordNotFound(err)) {
      throw ApiError.notFound("User not found.");
    }
    if (isUniqueViolation(err)) {
      throw ApiError.conflict("Email is already registered.");
    }
    throw err;
  }
}

export async function deleteUser(id: string): Promise<void> {
  try {
    await prisma.user.delete({
      where: { id },
    });
  } catch (err) {
    if (isRecordNotFound(err)) {
      throw ApiError.notFound("User not found.");
    }
    throw err;
  }
}
