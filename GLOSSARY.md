# Wedding photo collection

Guests send photos from the wedding day. The couple review those photos later in a private admin gallery.

## Language

**Uploaded photo**:
An image a guest stored through the public uploader.
_Avoid_: File, memory, asset, media

**Admin gallery**:
The password-gated overview of uploaded photos for the couple.
_Avoid_: Dashboard, CMS, media library, public gallery

**Gate**:
The password check that admits someone to the admin gallery. There are no accounts.
_Avoid_: Login, sign-in, authentication provider

**Removal**:
Permanently deleting an uploaded photo from storage after confirmation.
_Avoid_: Unpublish, archive, hide

**Confirmation**:
The extra in-app step that must succeed before a removal runs.
_Avoid_: Browser alert, prompt, `window.confirm`

**Archive**:
The zip of uploaded photos the couple take from the admin gallery.
_Avoid_: Export, dump, backup, bundle, download-all
