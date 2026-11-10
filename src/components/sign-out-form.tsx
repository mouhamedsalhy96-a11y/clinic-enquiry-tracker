export function SignOutForm() {
  // A document navigation avoids rendering the protected inbox after cookies
  // change and discards its private client state on successful sign-out.
  return <form action="/auth/logout" method="post">
    <button type="submit" className="button secondary small">Sign out</button>
  </form>;
}

