# Content inbox

Drop the club's real photos, posters and details here, then run:

```bash
npm run content:import
```

That makes small, web-ready copies in `public/images/` (resized, converted to WebP, location
data stripped). Only those copies are committed; the originals in this folder stay on your
computer.

| Folder / file | What goes in it                                                                             | How to name things                                       |
| ------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `club.txt`    | College name, club email, social media links                                                | Fill in the blanks                                       |
| `logo/`       | The club logo (SVG or PNG with a transparent background is best)                            | Any name                                                 |
| `events/`     | **One PDF per event** with its poster and photos inside, or a folder of images              | Name the PDF after the event, e.g. `CTF Finals 2025.pdf` |
| `team/`       | PDFs with the photos of the office bearers, leads and core members, or one photo per person | Photo files: the person's name, e.g. `Nishan.jpg`        |
| `team.csv`    | Links and short bios per person (optional, can also be sent in chat)                        | `name` must match the website                            |
| `posters/`    | Standalone posters and social media creatives                                               | Any name                                                 |
| `gallery/`    | Other photos, in sub-folders per album if you like                                          | Any name                                                 |

PDFs need poppler (`brew install poppler`, already done on this Mac). The import pulls out
the photos embedded in each PDF (skipping logos and repeated images) and also saves page 1 as
an image. Photos from team PDFs are put in `team/_pdf-…/` first so they can be matched to
names; nothing in a folder starting with `_` goes on the site.

Tips:

- JPG, PNG, WebP and iPhone HEIC photos all work.
- Pick the best 15–30 photos per event rather than the whole camera roll: it keeps the site fast.
- Square-ish, well-lit, face-centred photos look best on the team cards.
- Only add photos of people who are okay with being on the public site.
