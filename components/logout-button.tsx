export function LogoutButton() {
  return (
    <form action="/admin/logout" method="post">
      <button className="ghost-button" type="submit">
        logout
      </button>
    </form>
  );
}
