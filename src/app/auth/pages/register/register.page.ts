import { Component } from "@angular/core";
import { RegisterComponent } from "../../components/register/register.component";

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [RegisterComponent],
  templateUrl: './register.page.html'
})
export class RegisterPage {
}
