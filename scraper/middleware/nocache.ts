export const nocache = (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
};
