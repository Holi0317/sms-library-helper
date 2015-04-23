from django.shortcuts import redirect, render
from .models import UserProfile
from .form import SettingForm
from django.conf import settings
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.core.urlresolvers import reverse, reverse_lazy
from django.utils import translation
from django.http import JsonResponse
from django.views.generic import FormView
from django.utils.translation import ugettext as _

from oauth2client.client import OAuth2WebServerFlow, AccessTokenRefreshError
from apiclient.discovery import build
import httplib2


FLOW = OAuth2WebServerFlow(client_id=settings.GOOGLE_OAUTH2_CLIENT_ID,
                           client_secret=settings.GOOGLE_OAUTH2_CLIENT_SECRET,
                           scope=('https://www.googleapis.com/auth/calendar',
                                  'https://www.googleapis.com/auth/plus.me'),
                           redirect_uri=settings.GOOGLE_REDIRECT_URI,
                           access_type='offline')


class AjaxableResponseMixin(object):
    """
    Mixin for supporting AJAX
    Also include login_required
    """
    def form_invalid(self, form):
        response = super(AjaxableResponseMixin, self).form_invalid(form)
        if self.request.is_ajax():
            data = [''.join(['<p>', str(j), ':', str(k), '</p>'])
                    for j, k in form.errors.items()]
            return JsonResponse({'message': ''.join(data)}, status=400)
        else:
            return response

    def form_valid(self, form):
        super(AjaxableResponseMixin, self).form_valid(form)

    @classmethod
    def as_view(cls, **initkwargs):
        view = super(AjaxableResponseMixin, cls).as_view(**initkwargs)
        return login_required(view,
                              login_url=reverse_lazy('account:auth_login'))


def index(request):
    return render(request, 'account/index.html')


def auth_login(request):
    auth_uri = FLOW.step1_get_authorize_url()
    try:
        request.session['next'] = request.GET['next']
    except KeyError:
        request.session['next'] = None
    return redirect(auth_uri)


def oauth2callback(request):
    credential = FLOW.step2_exchange(request.GET)
    http = credential.authorize(httplib2.Http())
    plus = build('plus', 'v1')
    try:
        req = plus.people().get(userId='me').execute(http=http)
    except AccessTokenRefreshError:
        # Force refresh credential
        credential.refresh()
        http = credential.authorize(httplib2.Http())
        plus = build('plus', 'v1')
        req = plus.people().get(userId='me').execute(http=http)
    name = req['displayName']
    id = req['id']

    # Check if user have registered
    profile, created = UserProfile.objects.get_or_create(
        id=id, defaults={'name': name})

    if created:
        # fill in user informations
        user = User.objects.create_user(name,
                                        password=settings.COMMON_PASSWORD)
        profile.user = user
    else:
        # update user name
        user = profile.user
        user.username = name

    # Store credential for furure use
    profile.credential = credential.to_json()
    user.save()
    profile.save()

    user = authenticate(username=name, password=settings.COMMON_PASSWORD)
    login(request, user)

    translation.activate(profile.lang)
    request.session[translation.LANGUAGE_SESSION_KEY] = profile.lang
    request.session['django_language'] = profile.lang
    request.session.modified = True

    if request.session['next'] is None:
        del request.session['next']
        return redirect(reverse('account:index'))
    else:
        target = request.session['next']
        del request.session['next']
        return redirect(target)


class change_settings(AjaxableResponseMixin, FormView):
    template_name = 'account/settings.html'
    form_class = SettingForm
    success_url = reverse_lazy('account:change_settings')

    def get_form_kwargs(self):
        'Override this for passing request to form object'
        kwargs = super(change_settings, self).get_form_kwargs()
        kwargs.update({'request': self.request})
        return kwargs

    def form_valid(self, form):
        response = super(change_settings, self).form_valid(form)
        action = form.save()
        if action == 'update':
            if self.request.is_ajax():
                data = {
                    'message': _('successfully updated profile')
                }
                return JsonResponse(data, status=202)
            else:
                return response
        elif action == 'delete':
            return redirect('/')


def auth_logout(request):
    logout(request)
    return redirect(reverse('account:index'))