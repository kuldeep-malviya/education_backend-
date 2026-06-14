import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });
  if (!result.success) {
    return next(
      new ApiError(
        400,
        'Validation failed',
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      )
    );
  }
  req.body = result.data.body ?? req.body;
  req.params = result.data.params ?? req.params;
  req.query = result.data.query ?? req.query;
  next();
};
