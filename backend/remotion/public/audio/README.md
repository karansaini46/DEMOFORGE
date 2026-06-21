# Background music

Drop a royalty-free background track here (e.g. `bg.mp3`) and point `MUSIC_PATH`
in `backend/.env` at it, for example:

```
MUSIC_PATH=./remotion/public/audio/bg.mp3
```

If `MUSIC_PATH` is unset or the file is missing, the pipeline renders with
voiceover only (no music) — it does not fail.
