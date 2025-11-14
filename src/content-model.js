module.exports = function (migration) {
  const post = migration
    .createContentType("post")
    .name("Post")
    .description("")
    .displayField("internalTitle");
  post
    .createField("internalTitle")
    .name("Internal Title")
    .type("Symbol")
    .localized(false)
    .required(true)
    .validations([])
    .disabled(false)
    .omitted(false);
  post
    .createField("markdown")
    .name("Markdown")
    .type("Text")
    .localized(false)
    .required(true)
    .validations([])
    .disabled(false)
    .omitted(false);
  post.changeFieldControl("internalTitle", "builtin", "singleLine", {});
  post.changeFieldControl("markdown", "builtin", "markdown", {});
};
