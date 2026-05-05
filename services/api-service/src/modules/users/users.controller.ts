import type { Response, NextFunction, Request } from "express";

import { sendSuccess } from "../../utils/httpResponse";
import type { UpdateUserInput } from "./users.validation";
import * as usersService from "./users.service";

// Trim a Prisma user record down to the public response shape.
export function formatUser(record: {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// POST /api/users
export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await usersService.createUser(req.body);
    sendSuccess(res, 201, "User created successfully.", formatUser(created));
  } catch (err) {
    next(err);
  }
}

// GET /api/users
export async function listUsers(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const users = await usersService.listUsers();
    sendSuccess(
      res,
      200,
      "Users retrieved successfully.",
      users.map(formatUser),
    );
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id
export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await usersService.getUserById(req.params.id);
    sendSuccess(res, 200, "User retrieved successfully.", formatUser(user));
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id
export async function patchUserById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as UpdateUserInput;
    const updated = await usersService.updateUser(req.params.id, body);
    sendSuccess(res, 200, "User updated successfully.", formatUser(updated));
  } catch (err) {
    next(err);
  }
}

// DELETE /api/users/:id
export async function deleteUserById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await usersService.deleteUser(req.params.id);
    sendSuccess(res, 200, "User deleted successfully.", {});
  } catch (err) {
    next(err);
  }
}
