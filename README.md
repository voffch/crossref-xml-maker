# TODO

notes to self:

- REMEMBER zero-length fields
- hide/show hints (useContext?)
- field validations
- DOI validation (+ prefix)
- check REQUIRED fields
- save progress (to local storage) button
- hide/show all
- remove comments
- refactor var names (handlers, changers, fields/tags, etc)
- check if doesn't fail in parseInitialXML on nonexistent tags/tag arrays in the loaded xml
- hide/show rendered XML
- conference_date -> attributes parsing

Done:

- all remaining article fields
  - abstract, remove newlines
  - pages
  - license
  - doi
  - resource link
  - pdf-ka link
  - citations
- STRIP (trim) every field
- add/remove articles
- local storage for all permanent settings
- fill section header, journal header, author header with info from the fields
- custom date format (w/o day or month)
- individual pub date for articles
- hide author(s)
- remove arbitrary author (not just the last one)
- remove arbitrary article
- if remove - real (non-index) keys for the articles/contributors
- optimize for large files: recreate output xml on button click
- optimize for large files: consider onChange rather than onInput
- load xml
- save permanent head&jounals fields (loaded from xml) to localStorage
- generate sample xmls (altered and not altered) and test their validity
- print dates
- conference proceedings support (one common metadata, swapped contributors and titles, no license)
- optimize: trim fields onChange within handlers

## toolchain

preact + vite

## commands

- `npm run dev` - Starts a dev server at http://localhost:5173/
- `npm run build` - Builds for production, emitting to `dist/`
- `npm run preview` - Starts a server at http://localhost:4173/ to test production build locally