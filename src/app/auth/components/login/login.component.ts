import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ErrorResponse } from '../../models/error-response.model';
import { LoginResponse } from '../../models/login-response.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  error = '';
  successMessage = '';

  constructor(
    public formBuilder: FormBuilder,
    public authService: AuthService,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    if (this.loginForm.invalid) {
      return;
    }

    const { username, password } = this.loginForm.value;

    this.login(username, password);
  }

  private login(username: string, password: string) {
    // Clear previous messages before new login attempt
    this.error = '';
    this.successMessage = '';
    this.authService.loginSoap(username, password)
      .subscribe({
        next: (loginResponse) => {
          if (loginResponse) {
            if (loginResponse as LoginResponse !== null) {
              console.log(loginResponse);
              this.successMessage = `Welcome, ${username}. You have successfully logged in!`;
            } else {
              const errorResponse = loginResponse as ErrorResponse;
              if (errorResponse.ResultMessage === 'User not found')
                this.error = 'User does not exist';
              else this.error = errorResponse.ResultMessage;
            }
          } else {
            this.error = 'Invalid username or password';
          }
        },
        error: (err) => {
          this.error = 'Login error. Please try again.';
        }
      });
  }
}
