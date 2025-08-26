import { getReasonPhrase, StatusCodes } from "http-status-codes";

export class CustomError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export class BadRequestError extends CustomError {
  constructor(message: string = getReasonPhrase(StatusCodes.BAD_REQUEST)) {
    super(message, StatusCodes.BAD_REQUEST);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = getReasonPhrase(StatusCodes.UNAUTHORIZED)) {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = getReasonPhrase(StatusCodes.FORBIDDEN)) {
    super(message, StatusCodes.FORBIDDEN);
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = getReasonPhrase(StatusCodes.NOT_FOUND)) {
    super(message, StatusCodes.NOT_FOUND);
  }
}

export class InternalServerError extends CustomError {
  constructor(
    message: string = getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR)
  ) {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}
