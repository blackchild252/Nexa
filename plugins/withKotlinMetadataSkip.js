const { withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// nexa-kotlin-metadata-skip';
const SNIPPET = `
${MARKER}
allprojects {
  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    compilerOptions.freeCompilerArgs.add("-Xskip-metadata-version-check")
  }
}
`;

module.exports = function withKotlinMetadataSkip(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += SNIPPET;
    }
    return cfg;
  });
};
