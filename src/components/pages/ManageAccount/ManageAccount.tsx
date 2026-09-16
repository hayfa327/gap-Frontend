// src/pages/ManageAccount/ManageAccount.tsx
import { Link } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import './ManageAccount.css';

type Role = 'visitor' | 'artist' | 'admin';

interface ActionLink {
  to: string;
  label: string;
  primary?: boolean;
}

const actionsByRole: Record<Role, ActionLink[]> = {
  visitor: [
    { to: '/update-payment', label: 'Update Payment', primary: true },
    { to: '/change-password', label: 'Change Password' },
  ],
  artist: [
    { to: '/my-art', label: 'Edit Artwork', primary: true },
    { to: '/update-payment', label: 'Update Payment' },
    { to: '/change-password', label: 'Change Password' },
  ],
  admin: [
    { to: '/change-password', label: 'Change Password', primary: true },
    { to: '/update-payment', label: 'Update Payment' },
    { to: '/manage-admins', label: 'Add and Delete Admin' },
    { to: '/all-users', label: 'Get All Users' },
  ],
};

export default function ManageAccount() {
  const role = localStorage.getItem('role') as Role | null;
  const actions = role ? actionsByRole[role] : [];

  return (
    <>
      <Nav />

      <section className="manageAccountPage">
        <div className="manageAccountContent">
          <p className="eyebrow">Account</p>
          <h1 className="pageTitle">Living Art Platform</h1>
          <p className="pageSubtitle">Museum account management</p>

          {!role && (
            <p className="stateMsg">
              You need to be signed in to manage your account.
            </p>
          )}

          {role && (
            <div className="actions">
              {actions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className={action.primary ? 'primaryBtn' : 'secondaryBtn'}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}