module.exports = function (api) {
  api.cache(true);

  // Only include Draftbit plugins if they exist (Draftbit sandbox only)
  const plugins = [];
  try {
    require.resolve("@draftbit/babel-plugin-inject-jsx-source");
    plugins.push("@draftbit/babel-plugin-inject-jsx-source");
  } catch (e) {
    // Plugin not available (production build) - that's okay
  }

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind", unstable_transformImportMeta: true }],
      "nativewind/babel",
    ],
    plugins,
  };
};
