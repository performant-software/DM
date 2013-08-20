from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.contrib.auth import authenticate, login, logout
from django.conf import settings

def sign_in(request):
    next_url = request.GET.get('next', settings.LOGIN_REDIRECT_URL)

    if request.user.is_authenticated():
        return redirect(next_url)

    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(username=username, password=password)
        if user is not None:
            if user.is_active:
                login(request, user)
                return redirect(next_url)
            else:
                pass
                # should: return a 'disabled account' error message
        else:
            context = RequestContext(request, dict(next=next_url,
                                                   error=True))
            return render_to_response("accounts/sign_in.html", 
                                      context_instance=context)
            
    context = RequestContext(request, dict(next=next_url))
    return render_to_response("accounts/sign_in.html", context_instance=context)
        

def sign_out(request):
    logout(request)
    return redirect("accounts_sign_in")
