import type { User } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import type { CreateUserInput, UpdateUserInput } from "./users.validation";

// Helpers for translating Prisma error codes into named ApiErrors.
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

// Insert a new user; defaults role to USER if the client didn't provide one.
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

// All users, newest first.
export async function listUsers(): Promise<User[]> {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// Single user lookup; 404 if missing.
export async function getUserById(id: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (user === null) {
    throw ApiError.notFound("User not found.");
  }

  return user;
}

// Partial update with conflict + not-found mapping.
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

// Cascades to pantry items and recall alerts via Prisma onDelete: Cascade.
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
