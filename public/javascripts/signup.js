
//variables



var reg_email = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
var btn_otp = document.getElementById("btn-otp")
var txt_email = document.getElementById("user")
var txt_otp = document.getElementById("otp")
var form_signup = document.getElementById("signupForm")
var txt_key = document.getElementById("key")
var txt_ckey = document.getElementById("ckey")
var span_verified = document.getElementById("caution")

var loading = document.createElement("span");
loading.setAttribute("class", "spinner-border spinner-border-sm");
loading.setAttribute("role","status");
loading.setAttribute("aria-hidden","true");


//functions

function compareInputs(elem, elem2){
    console.log(elem.value, elem2.value);
    if(elem.value === elem2.value){
        return true;
    }
    return false;
}

//events register

btn_otp.addEventListener("click", function(){
    span_verified.innerHTML = ""  
    if(reg_email.test(txt_email.value)){
        if(!txt_otp.disabled){
            txt_otp.disabled = true;
        }
        btn_otp.insertBefore(loading, btn_otp.childNodes[0]);
        $.post("/sendcode", {"email" : txt_email.value }).done(function(data){
            txt_otp.disabled = false
            span_verified.innerHTML = "OTP sent"
            btn_otp.removeChild(btn_otp.firstChild);
        }).fail(function(data){
            span_verified.innerHTML = data.responseText;
            btn_otp.removeChild(btn_otp.firstChild);  
        })
    }
    else{
        span_verified.innerHTML = "Incorrect email address."
    }
})

form_signup.addEventListener("submit", function(event){
    console.log("About to submit.")
    if(txt_otp.disabled || !compareInputs(txt_key, txt_ckey)){
        event.preventDefault()
        event.stopPropagation()  
        span_verified.innerHTML = "Something went wrong." 
    }
})

// Event register
txt_otp.disabled = true
