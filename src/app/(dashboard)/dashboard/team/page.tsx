"use client";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Équipe</h1>
          <p className="text-sm text-text-secondary mt-1">
            Gérez les accès à votre tableau de bord.
          </p>
        </div>
        <button className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          Inviter un membre
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold">Membres de {"l'"}équipe</h3>
          <p className="text-xs text-text-secondary mt-1">2 membres sur 5 (plan Standard)</p>
        </div>

        <div className="divide-y divide-border">
          {[
            { name: "Vous", email: "marchand@boutique.fr", role: "Admin" },
          ].map((member) => (
            <div
              key={member.email}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-medium text-brand-600">
                  {member.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-text-secondary">{member.email}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700 font-medium">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
