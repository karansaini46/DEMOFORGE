import ffmpeg from 'fluent-ffmpeg';

// Point fluent-ffmpeg at the npm-bundled ffmpeg/ffprobe binaries so video
// assembly and audio probing work identically across dev, CI, and Docker
// without depending on system-installed tools.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export { ffmpeg };
