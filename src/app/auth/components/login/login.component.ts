import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

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
    this.authService.loginSoap(username, password)
      .subscribe({
        next: (user) => {
          if (user) {
            console.log(user);
          } else {
            this.error = 'Неверное имя пользователя или пароль';
          }
        },
        error: (err) => {
          this.error = 'Ошибка входа. Пожалуйста, попробуйте еще раз.';
        }
      });
  }
}
