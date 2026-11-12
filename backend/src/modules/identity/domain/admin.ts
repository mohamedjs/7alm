import { DomainError } from "../../../shared/domain/domain-error";

export interface AdminProps {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string | null;
  isActive: boolean;
}

/** An admin who can sign in to the dashboard. */
export class Admin {
  private constructor(private readonly props: AdminProps) {}

  static restore(props: AdminProps): Admin {
    return new Admin(props);
  }

  static normaliseEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  get id() {
    return this.props.id;
  }
  get email() {
    return this.props.email;
  }
  get fullName() {
    return this.props.fullName;
  }
  get passwordHash() {
    return this.props.passwordHash;
  }

  assertCanSignIn(): void {
    if (!this.props.isActive) throw DomainError.forbidden("You are not authorized as an admin");
  }

  toPublic() {
    return { id: this.props.id, email: this.props.email, full_name: this.props.fullName };
  }
}
